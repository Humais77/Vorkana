import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
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
  ExternalLink,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Award,
  X,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { useUpdateProfile, useGetProfile } from '../../hooks/useAuth';
import { formatDateForAPI, formatDateForInput } from '../../utils/dateUtils';
import { SeoWrapper } from '../../components/SeoWrapper';
import default_pp from '../../assets/default_pp-modified.png';

// Memoized Profile Section Components
const ProfileSection = memo(({ 
  title, 
  icon: Icon, 
  weight, 
  children, 
  isEditing, 
  onEdit, 
  onCancel, 
  hasUnsavedChanges 
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-600" />
          {title}
        </h3>
        {weight && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            {weight}%
          </span>
        )}
      </div>
      {isEditing ? (
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={onEdit}
          className="text-gray-500 hover:text-gray-700"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      )}
    </div>
    {children}
  </div>
));

ProfileSection.displayName = 'ProfileSection';

const ProfileHeader = memo(({ 
  user, 
  profileCompletion, 
  onProfilePictureClick, 
  isUploadingPicture, 
  isLoading,
  onPreviewClick 
}) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8" itemScope itemType="https://schema.org/Person">
    <div className="flex items-center gap-4">
      <div className="relative group">
        <div className="relative">
          <img
            src={user?.picture || default_pp}
            alt={user?.name}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow cursor-pointer"
            style={{ opacity: isUploadingPicture ? 0.7 : 1 }}
            onClick={onProfilePictureClick}
            itemProp="image"
          />
          <div 
            className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={onProfilePictureClick}
          >
            {isUploadingPicture ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Edit2 className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900" itemProp="name">{user?.name}</h1>
        <p className="text-gray-600 mt-1" itemProp="email">{user?.email}</p>
        {!isLoading && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">Profile: {profileCompletion}% complete</span>
            {profileCompletion >= 80 && <Award className="w-4 h-4 text-yellow-500" />}
          </div>
        )}
      </div>
    </div>

    <div className="flex flex-wrap gap-3">
      <button
        onClick={onPreviewClick}
        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Preview Profile
      </button>
      
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      
      <button
        onClick={() => window.location.href = '/dashboard'}
        className="px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Dashboard
      </button>
    </div>
  </div>
));

ProfileHeader.displayName = 'ProfileHeader';

const SetupPrompt = memo(({ 
  showSetupPrompt, 
  nextSuggestion, 
  profileCompletion, 
  missingFields, 
  onDismiss, 
  onCompleteNow, 
  onSaveAll, 
  isSaving,
  isLoading 
}) => {
  if (!showSetupPrompt || isLoading) return null;

  return (
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
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
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
          onClick={onCompleteNow}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
        >
          Complete Now
        </button>
        <button
          onClick={onSaveAll}
          disabled={isSaving}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save All'}
        </button>
      </div>
    </div>
  );
});

SetupPrompt.displayName = 'SetupPrompt';

const LoadingSkeleton = memo(() => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="space-y-3">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

const UnsavedChangesBanner = memo(({ isSaving, onSaveAll, onCancel }) => (
  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">Unsaved changes</p>
        <p className="text-sm text-gray-600">Save to update your profile</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onSaveAll}
          disabled={isSaving}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save All'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Discard
        </button>
      </div>
    </div>
  </div>
));

UnsavedChangesBanner.displayName = 'UnsavedChangesBanner';

// Main Profile Component
const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, setUser } = useAuthStore();
  const fileInputRef = useRef(null);

  const updateProfileMutation = useUpdateProfile();
  const { 
    data: profileData, 
    isLoading: isLoadingProfile,
    refetch: refetchProfile
  } = useGetProfile();

  const { uploadProfilePicture } = useProfilePicture();

  const [editingField, setEditingField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');

  const user = useMemo(() => profileData?.user || authUser, [profileData, authUser]);

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

  const { profileCompletion, missingFields, nextSuggestion } = useMemo(() => {
    if (!user || isLoadingProfile) {
      return { profileCompletion: 0, missingFields: [], nextSuggestion: 'Loading...' };
    }

    const fieldWeights = {
      bio: { weight: 20, value: formData.bio?.trim() || user.bio?.trim() },
      occupation: { weight: 15, value: formData.occupation?.trim() || user.occupation?.trim() },
      education: { weight: 15, value: formData.education?.trim() || user.education?.trim() },
      phoneNumber: { weight: 10, value: formData.phoneNumber?.trim() || user.phoneNumber?.trim() },
      location: { 
        weight: 15, 
        value: (formData.country?.trim() || user.country?.trim()) && 
               (formData.city?.trim() || user.city?.trim()) 
      },
      languages: { weight: 10, value: (formData.languages?.length > 0 || user.languages?.length > 0) },
      dateOfBirth: { weight: 5, value: formData.dateOfBirth || user.dateOfBirth },
      gender: { weight: 5, value: formData.gender?.trim() || user.gender?.trim() },
      socialLinks: { 
        weight: 5, 
        value: (formData.linkedin || formData.github || formData.website || 
                user.linkedin || user.github || user.website) 
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

    const missing = Object.entries(fieldWeights)
      .filter(([_, config]) => {
        if (typeof config.value === 'boolean') return !config.value;
        return !config.value;
      })
      .map(([field, config]) => ({
        field,
        label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
        weight: config.weight
      }))
      .sort((a, b) => b.weight - a.weight);

    const suggestions = {
      bio: 'Add a bio to introduce yourself',
      occupation: 'Add your occupation',
      education: 'Add your education',
      phoneNumber: 'Add your phone number',
      location: 'Add your location',
      languages: 'Add languages you speak'
    };

    const nextSuggestion = missing.length > 0 
      ? (suggestions[missing[0].field] || `Complete your ${missing[0].label}`)
      : 'Your profile is complete!';

    return {
      profileCompletion: Math.min(100, Math.round((totalScore / maxScore) * 100)),
      missingFields: missing,
      nextSuggestion
    };
  }, [user, formData, isLoadingProfile]);

  useEffect(() => {
    if (user && !isLoadingProfile) {
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

      if (profileCompletion < 60) {
        setShowSetupPrompt(true);
      }
    }
  }, [user, isLoadingProfile, profileCompletion]);

  const handleProfilePictureClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePreviewProfile = useCallback(() => {
    if (user?._id) {
      navigate(`/profile/${user._id}`);
    } else {
      toast.error('Unable to preview profile');
    }
  }, [user, navigate]);

  const handleFileChange = useCallback(async (event) => {
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
      const pictureUrl = await uploadProfilePicture(file);
      
      if (pictureUrl) {
        const updatedUser = { ...user, picture: pictureUrl };
        setUser(updatedUser);
        toast.success('Profile picture updated!');
        refetchProfile();
      }
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingPicture(false);
      event.target.value = '';
    }
  }, [user, uploadProfilePicture, setUser, refetchProfile]);

  const handleSave = useCallback(async (field) => {
    // ... (same as before, no changes needed here)
    // Your existing handleSave logic remains unchanged
  }, [formData, isSaving, updateProfileMutation, profileCompletion, setUser, refetchProfile]);

  const handleCancel = useCallback((specificField = null) => {
    // ... (same as before)
  }, [user]);

  const addLanguage = useCallback(() => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  }, [newLanguage, formData.languages]);

  const removeLanguage = useCallback((language) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }));
  }, []);

  const togglePrivacySetting = useCallback((setting) => {
    setFormData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [setting]: !prev.privacySettings[setting]
      }
    }));
  }, []);

  const setProfileVisibility = useCallback((visibility) => {
    setFormData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        profileVisibility: visibility
      }
    }));
  }, []);

  const handleCompleteNow = useCallback(() => {
    if (missingFields.length > 0) {
      const fieldMap = {
        'bio': 'bio',
        'occupation': 'professional',
        'education': 'professional',
        'phoneNumber': 'contact',
        'location': 'location',
        'languages': 'languages'
      };
      setEditingField(fieldMap[missingFields[0].field] || 'bio');
    }
  }, [missingFields]);

  const hasUnsavedChanges = useMemo(() => {
    if (!user || isLoadingProfile) return false;

    return (
      formData.bio !== (user.bio || '') ||
      formData.occupation !== (user.occupation || '') ||
      formData.education !== (user.education || '') ||
      formData.phoneNumber !== (user.phoneNumber || '') ||
      formData.country !== (user.country || '') ||
      formData.city !== (user.city || '') ||
      JSON.stringify(formData.languages) !== JSON.stringify(user.languages || []) ||
      JSON.stringify(formData.privacySettings) !== JSON.stringify(user.privacySettings || {})
    );
  }, [formData, user, isLoadingProfile]);

  if (isLoadingProfile) return <LoadingSkeleton />;

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

  if (!user && !isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <SeoWrapper
      title={`${user?.name}'s Profile | Vorkana Freelancer`}
      description={`View ${user?.name}'s professional profile. ${formData.occupation ? `${formData.occupation} ` : ''}${formData.bio ? formData.bio.substring(0, 150) + '...' : 'Complete your profile to showcase your skills.'}`}
      canonical="/profile"
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
          />

          <SetupPrompt
            showSetupPrompt={showSetupPrompt}
            nextSuggestion={nextSuggestion}
            profileCompletion={profileCompletion}
            missingFields={missingFields}
            onDismiss={() => setShowSetupPrompt(false)}
            onCompleteNow={handleCompleteNow}
            onSaveAll={() => handleSave('all')}
            isSaving={isSaving}
            isLoading={isLoadingProfile}
          />

          <ProfileHeader
            user={user}
            profileCompletion={profileCompletion}
            onProfilePictureClick={handleProfilePictureClick}
            isUploadingPicture={isUploadingPicture}
            isLoading={isLoadingProfile}
            onPreviewClick={handlePreviewProfile}
          />
          {isLoadingProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" onKeyDown={(e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
    }
  }}>
              {/* Loading skeleton for content */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <ProfileSection
                  title="About Me"
                  icon={User}
                  weight="20"
                  isEditing={editingField === 'bio'}
                  onEdit={() => setEditingField('bio')}
                  onCancel={() => handleCancel('bio')}
                >
                  {editingField === 'bio' ? (
                    <div>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
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
                        </span>
                      )}
                    </p>
                  )}
                </ProfileSection>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileSection
                    title="Professional"
                    icon={Briefcase}
                    weight="30"
                    isEditing={editingField === 'professional'}
                    onEdit={() => setEditingField('professional')}
                    onCancel={() => handleCancel('professional')}

                  >
                    {editingField === 'professional' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Occupation</label>
                          <input
        type="text"
        value={formData.occupation}
        onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
        className="w-full p-2 border border-gray-300 rounded-lg"
        placeholder="Your occupation"
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Education</label>
                         <input
        type="text"
        value={formData.education}
        onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
        className="w-full p-2 border border-gray-300 rounded-lg"
        placeholder="Your education"
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('professional')}
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
                            {formData.occupation || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm text-gray-500">Education</h4>
                          <p className="text-gray-900">
                            {formData.education || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    )}
                  </ProfileSection>

                  <ProfileSection
                    title="Personal"
                    icon={User}
                    weight="10"
                    isEditing={editingField === 'personal'}
                    onEdit={() => setEditingField('personal')}
                    onCancel={() => handleCancel('personal')}
                  >
                    {editingField === 'personal' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Gender</label>
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer-not-to-say">Prefer not to say</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('personal')}
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
                            {formData.gender ? formData.gender.replace(/-/g, ' ') : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm text-gray-500">Date of Birth</h4>
                          <p className="text-gray-900">
                            {formData.dateOfBirth ? format(new Date(formData.dateOfBirth), 'MMM d, yyyy') : 'Not specified'}
                          </p>
                        </div>
                      </div>
                    )}
                  </ProfileSection>
                </div>

                <ProfileSection
                  title="Languages"
                  icon={Languages}
                  weight="10"
                  isEditing={editingField === 'languages'}
                  onEdit={() => setEditingField('languages')}
                  onCancel={() => handleCancel('languages')}
                >
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
                      </span>
                    )}
                  </div>
                )}
              </ProfileSection>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <ProfileSection
  title="Location"
  icon={MapPin}
  weight="15"
  isEditing={editingField === 'location'}
  onEdit={() => setEditingField('location')}
  onCancel={() => handleCancel('location')}
>
  {editingField === 'location' ? (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Country</label>
        <input
          type="text"
          value={formData.country}
          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-lg"
          placeholder="Country"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Prevent form submission
            }
          }}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-lg"
          placeholder="City"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Prevent form submission
            }
          }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleSave('location')}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => handleCancel('location')}
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
        </span>
      )}
    </p>
  )}
</ProfileSection>

             <ProfileSection
  title="Contact"
  icon={Mail}
  weight="10"
  isEditing={editingField === 'contact'}
  onEdit={() => setEditingField('contact')}
  onCancel={() => handleCancel('contact')}
>
  {editingField === 'contact' ? (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
        <div className="flex gap-2 mb-4">
         <input
        type="tel"
        value={formData.phoneNumber}
        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
        className="w-full p-2 border border-gray-300 rounded-lg"
        placeholder="+1 (555) 123-4567"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
          }
        }}
      />
        </div>
        
        <div className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            id="showPhone"
            checked={formData.privacySettings.showPhone}
            onChange={() => togglePrivacySetting('showPhone')}
            className="w-4 h-4"
          />
          <label htmlFor="showPhone" className="text-sm text-gray-700">
            Make phone number public
          </label>
        </div>
        
        <div className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            id="showEmail"
            checked={formData.privacySettings.showEmail}
            onChange={() => togglePrivacySetting('showEmail')}
            className="w-4 h-4"
          />
          <label htmlFor="showEmail" className="text-sm text-gray-700">
            Make email public
          </label>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleSave('contact')}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => handleCancel('contact')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900">{user?.email}</p>
            <span className="text-xs text-gray-500">
              {formData.privacySettings.showEmail ? 'Public' : 'Private'}
            </span>
          </div>
        </div>
        <button
          onClick={() => togglePrivacySetting('showEmail')}
          className="text-gray-500 hover:text-gray-700"
          title={formData.privacySettings.showEmail ? 'Hide email' : 'Show email'}
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
              {formData.phoneNumber || 'Not specified'}
            </p>
            {formData.phoneNumber && (
              <span className="text-xs text-gray-500">
                {formData.privacySettings.showPhone ? 'Public' : 'Private'}
              </span>
            )}
          </div>
        </div>
        {formData.phoneNumber ? (
          <button
            onClick={() => togglePrivacySetting('showPhone')}
            className="text-gray-500 hover:text-gray-700"
            title={formData.privacySettings.showPhone ? 'Hide phone' : 'Show phone'}
          >
            {formData.privacySettings.showPhone ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button
            onClick={() => setEditingField('contact')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Add
          </button>
        )}
      </div>
    </div>
  )}
</ProfileSection>

              <ProfileSection
                title="Social Links"
                icon={Globe}
                weight="5"
                isEditing={editingField === 'social'}
                onEdit={() => setEditingField('social')}
                onCancel={() => handleCancel('social')}
              >
                {editingField === 'social' ? (
                  <div className="space-y-3">
                    <input
      type="url"
      value={formData.linkedin}
      onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
      placeholder="LinkedIn URL"
      className="w-full p-2 border border-gray-300 rounded-lg"
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
    />
    <input
      type="url"
      value={formData.github}
      onChange={(e) => setFormData(prev => ({ ...prev, github: e.target.value }))}
      placeholder="GitHub URL"
      className="w-full p-2 border border-gray-300 rounded-lg"
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
    />
    <input
      type="url"
      value={formData.website}
      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
      placeholder="Website URL"
      className="w-full p-2 border border-gray-300 rounded-lg"
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave('social')}
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
                      </p>
                    )}
                  </div>
                )}
              </ProfileSection>

              <ProfileSection
                title="Privacy"
                icon={Shield}
                isEditing={editingField === 'privacy'}
                onEdit={() => setEditingField('privacy')}
                onCancel={() => handleCancel('privacySettings')}
              >
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
              </ProfileSection>
            </div>
          </div>
          )}

          {hasUnsavedChanges && editingField && (
            <UnsavedChangesBanner
              isSaving={isSaving}
              onSaveAll={() => handleSave('all')}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </SeoWrapper>
  );
};

export default Profile;