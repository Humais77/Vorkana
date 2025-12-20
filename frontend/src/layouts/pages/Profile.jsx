import React, { useState, useEffect } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import default_pp from '../../assets/default_pp-modified.png';
import { format, parseISO } from 'date-fns';

// Import API hooks
import { useUpdateProfile, useGetProfile } from '../../hooks/useAuth';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuthStore();

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
  const calculateProfileCompletion = (userData = user, formDataState = formData) => {
    if (!userData) return 0;
    
    const fieldWeights = {
      bio: { weight: 20, value: formDataState.bio?.trim() || userData.bio },
      occupation: { weight: 15, value: formDataState.occupation?.trim() || userData.occupation },
      education: { weight: 15, value: formDataState.education?.trim() || userData.education },
      phoneNumber: { weight: 10, value: formDataState.phoneNumber?.trim() || userData.phoneNumber },
      country: { weight: 8, value: formDataState.country?.trim() || userData.country },
      city: { weight: 7, value: formDataState.city?.trim() || userData.city },
      languages: { weight: 10, value: (formDataState.languages?.length > 0 || userData.languages?.length > 0) },
      dateOfBirth: { weight: 5, value: formDataState.dateOfBirth || userData.dateOfBirth },
      gender: { weight: 5, value: formDataState.gender?.trim() || userData.gender },
      socialLinks: { 
        weight: 5, 
        value: (formDataState.linkedin || formDataState.github || formDataState.website || 
                userData.linkedin || userData.github || userData.website) 
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
    
    // Sort by weight (importance)
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
        dateOfBirth: user.dateOfBirth ? format(parseISO(user.dateOfBirth), 'yyyy-MM-dd') : '',
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
      
      // Show setup prompt if profile is less than 60% complete
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

  // Save handler - NOW UPDATES DATABASE
  const handleSave = async (field) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const updateData = {};
      
      if (field === 'all') {
        // Prepare all data for API
        updateData.bio = formData.bio;
        updateData.phoneNumber = formData.phoneNumber;
        updateData.country = formData.country;
        updateData.city = formData.city;
        updateData.languages = formData.languages;
        updateData.occupation = formData.occupation;
        updateData.education = formData.education;
        updateData.gender = formData.gender;
        updateData.dateOfBirth = formData.dateOfBirth || null;
        updateData.github = formData.github;
        updateData.linkedin = formData.linkedin;
        updateData.website = formData.website;
        updateData.privacySettings = formData.privacySettings;
      } else {
        // Prepare specific field for API
        updateData[field] = formData[field];
      }

      // Call the API mutation
      const result = await updateProfileMutation.mutateAsync(updateData);
      
      if (result.success) {
        // Update local state with the response data
        if (updateUser) {
          updateUser(result.user || updateData);
        }
        
        // Refetch profile to get latest data
        await refetchProfile();
        
        toast.success(field === 'all' ? 'Profile updated successfully!' : `${field} updated successfully!`);
        setEditingField(null);
        
        // Hide setup prompt if profile is sufficiently complete
        const newCompletion = calculateProfileCompletion();
        if (newCompletion >= 70) {
          setShowSetupPrompt(false);
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
        dateOfBirth: user.dateOfBirth ? format(parseISO(user.dateOfBirth), 'yyyy-MM-dd') : '',
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
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
          />
          <div>
            <h3 className="font-semibold text-gray-900">{user?.name}</h3>
            {formData.privacySettings.showEmail && (
              <p className="text-gray-600 text-sm">{user?.email}</p>
            )}
            {(formData.city || formData.country) && formData.privacySettings.showLocation && (
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {formData.city}{formData.city && formData.country && ', '}{formData.country}
              </p>
            )}
          </div>
        </div>

        {formData.bio && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">About</h4>
            <p className="text-gray-600 text-sm">{formData.bio}</p>
          </div>
        )}

        {(formData.occupation || formData.education) && (
          <div className="grid grid-cols-2 gap-4">
            {formData.occupation && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Occupation</h4>
                <p className="text-gray-900">{formData.occupation}</p>
              </div>
            )}
            {formData.education && (
              <div>
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
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
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
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user?.picture || default_pp}
                alt={user?.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow"
              />
              
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-600 mt-1">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">Profile: {profileCompletion}% complete</span>
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
              <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{formData.bio.length}/500 characters</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave('bio')}
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
                  </div>
                ) : (
                  <p className="text-gray-600">
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
                        />
                        <label className="block text-sm text-gray-600 mb-1">Education (15%)</label>
                        <input
                          type="text"
                          value={formData.education}
                          onChange={(e) => setFormData({...formData, education: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          placeholder="Your education"
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
                        <p className="text-gray-900">
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
                        <p className="text-gray-900">
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
                  <div className="flex flex-wrap gap-2">
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
                    />
                    <label className="block text-sm text-gray-600 mb-1">City (7%)</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                      placeholder="City"
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
                  <p className="text-gray-600">
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
                        <p className="text-gray-900">{user?.email}</p>
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
                        <p className="text-gray-900">
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
                  <div className="space-y-3">
                    {formData.linkedin && (
                      <a
                        href={formData.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-600 hover:text-gray-900"
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
  );
};

export default Profile;